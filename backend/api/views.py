from django.utils import timezone
from django.http import HttpResponse
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.db.models import Sum, Count

from .models import Driver, Truck, Customer, Trip, Invoice, InvoiceItem, MaintenanceRecord
from .serializers import (
    DriverSerializer, DriverListSerializer,
    TruckSerializer, TruckListSerializer,
    CustomerSerializer, CustomerListSerializer,
    TripSerializer, TripListSerializer,
    InvoiceSerializer, InvoiceListSerializer, InvoiceCreateSerializer,
    MaintenanceRecordSerializer,
)
from .invoice_generator import generate_invoice_pdf


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'license_number', 'phone']
    ordering_fields = ['last_name', 'hire_date', 'status']

    def get_serializer_class(self):
        return DriverListSerializer if self.action == 'list' else DriverSerializer


class TruckViewSet(viewsets.ModelViewSet):
    queryset = Truck.objects.select_related('current_driver').all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['registration_number', 'make', 'model']
    ordering_fields = ['registration_number', 'status', 'year']

    def get_serializer_class(self):
        return TruckListSerializer if self.action == 'list' else TruckSerializer

    @action(detail=True, methods=['post'])
    def add_maintenance(self, request, pk=None):
        truck = self.get_object()
        data = {**request.data, 'truck': truck.id}
        serializer = MaintenanceRecordSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            truck.status = 'maintenance'
            truck.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def maintenance_history(self, request, pk=None):
        truck = self.get_object()
        records = truck.maintenance_records.all()
        return Response(MaintenanceRecordSerializer(records, many=True).data)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name', 'contact_person', 'email', 'tax_number']
    ordering_fields = ['company_name', 'city']

    def get_serializer_class(self):
        return CustomerListSerializer if self.action == 'list' else CustomerSerializer


class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.select_related('truck', 'driver', 'customer').all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['trip_number', 'cargo_description', 'origin', 'destination']
    ordering_fields = ['departure_date', 'status', 'freight_amount']

    def get_serializer_class(self):
        return TripListSerializer if self.action == 'list' else TripSerializer

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        trip = self.get_object()
        new_status = request.data.get('status')
        if new_status not in dict(Trip.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        trip.status = new_status
        if new_status == 'in_progress':
            trip.driver.status = 'on_trip'
            trip.driver.save()
        elif new_status == 'completed':
            trip.arrival_date = timezone.now()
            trip.driver.status = 'available'
            trip.driver.save()
            trip.truck.status = 'active'
            trip.truck.save()
        trip.save()
        return Response(TripSerializer(trip).data)

    @action(detail=True, methods=['post'])
    def generate_invoice(self, request, pk=None):
        trip = self.get_object()
        if hasattr(trip, 'invoice'):
            return Response({'error': 'Invoice already exists for this trip'},
                            status=status.HTTP_400_BAD_REQUEST)
        due_days = trip.customer.payment_terms_days
        invoice = Invoice.objects.create(
            customer=trip.customer,
            trip=trip,
            due_date=timezone.now().date() + timezone.timedelta(days=due_days),
            subtotal=trip.freight_amount,
            tax_rate=0,
        )
        InvoiceItem.objects.create(
            invoice=invoice,
            description=f"{trip.trip_number} — {trip.cargo_description} ({trip.origin} to {trip.destination})",
            quantity=1,
            unit_price=trip.freight_amount,
            amount=trip.freight_amount,
        )
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('customer', 'trip').prefetch_related('items').all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['invoice_number', 'customer__company_name']
    ordering_fields = ['invoice_date', 'due_date', 'total', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer

    def create(self, request, *args, **kwargs):
        serializer = InvoiceCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            invoice = serializer.save()
            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        buf = generate_invoice_pdf(invoice)
        response = HttpResponse(buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.amount_paid = invoice.total
        invoice.payment_date = timezone.now().date()
        invoice.payment_reference = request.data.get('payment_reference', '')
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=['post'])
    def mark_sent(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'sent'
        invoice.save()
        return Response(InvoiceSerializer(invoice).data)


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.select_related('truck').all()
    serializer_class = MaintenanceRecordSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['truck__registration_number', 'description', 'service_provider']
    ordering_fields = ['date', 'cost']


@api_view(['GET'])
def dashboard_stats(request):
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    revenue = Trip.objects.filter(
        status='completed', departure_date__gte=month_start
    ).aggregate(total=Sum('freight_amount'))

    outstanding = Invoice.objects.filter(
        status__in=['sent', 'overdue']
    ).aggregate(count=Count('id'), amount=Sum('total'))

    recent_trips = Trip.objects.select_related('truck', 'driver', 'customer').order_by('-created_at')[:5]
    recent_invoices = Invoice.objects.select_related('customer').order_by('-invoice_date')[:5]

    return Response({
        'total_trucks': Truck.objects.count(),
        'active_trucks': Truck.objects.filter(status='active').count(),
        'trucks_in_maintenance': Truck.objects.filter(status='maintenance').count(),
        'total_drivers': Driver.objects.count(),
        'available_drivers': Driver.objects.filter(status='available').count(),
        'drivers_on_trip': Driver.objects.filter(status='on_trip').count(),
        'total_customers': Customer.objects.filter(is_active=True).count(),
        'trips_this_month': Trip.objects.filter(departure_date__gte=month_start).count(),
        'trips_in_progress': Trip.objects.filter(status='in_progress').count(),
        'revenue_this_month': float(revenue['total'] or 0),
        'outstanding_invoices': outstanding['count'] or 0,
        'outstanding_amount': float(outstanding['amount'] or 0),
        'recent_trips': TripListSerializer(recent_trips, many=True).data,
        'recent_invoices': InvoiceListSerializer(recent_invoices, many=True).data,
    })
