from rest_framework import serializers
from .models import Driver, Truck, Customer, Trip, Invoice, InvoiceItem, MaintenanceRecord


class DriverSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Driver
        fields = '__all__'


class DriverListSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Driver
        fields = ['id', 'full_name', 'first_name', 'last_name', 'license_number',
                  'phone', 'status', 'hire_date', 'license_expiry']


class TruckSerializer(serializers.ModelSerializer):
    current_driver_name = serializers.SerializerMethodField()

    class Meta:
        model = Truck
        fields = '__all__'

    def get_current_driver_name(self, obj):
        return obj.current_driver.full_name if obj.current_driver else None


class TruckListSerializer(serializers.ModelSerializer):
    current_driver_name = serializers.SerializerMethodField()

    class Meta:
        model = Truck
        fields = ['id', 'registration_number', 'make', 'model', 'year',
                  'capacity_tons', 'status', 'current_driver', 'current_driver_name',
                  'insurance_expiry', 'fitness_expiry', 'odometer_km']

    def get_current_driver_name(self, obj):
        return obj.current_driver.full_name if obj.current_driver else None


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class CustomerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'company_name', 'contact_person', 'email', 'phone',
                  'city', 'country', 'is_active', 'payment_terms_days']


class TripSerializer(serializers.ModelSerializer):
    truck_registration = serializers.ReadOnlyField(source='truck.registration_number')
    driver_name = serializers.ReadOnlyField(source='driver.full_name')
    customer_name = serializers.ReadOnlyField(source='customer.company_name')
    total_cost = serializers.ReadOnlyField()
    profit = serializers.ReadOnlyField()
    trip_number = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Trip
        fields = '__all__'
        extra_kwargs = {'trip_number': {'required': False}}

    def create(self, validated_data):
        validated_data.pop('trip_number', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('trip_number', None)
        return super().update(instance, validated_data)


class TripListSerializer(serializers.ModelSerializer):
    truck_registration = serializers.ReadOnlyField(source='truck.registration_number')
    driver_name = serializers.ReadOnlyField(source='driver.full_name')
    customer_name = serializers.ReadOnlyField(source='customer.company_name')
    profit = serializers.ReadOnlyField()

    class Meta:
        model = Trip
        fields = ['id', 'trip_number', 'truck', 'truck_registration', 'driver',
                  'driver_name', 'customer', 'customer_name', 'cargo_description',
                  'origin', 'destination', 'departure_date', 'arrival_date',
                  'status', 'freight_amount', 'profit']


class InvoiceItemWriteSerializer(serializers.Serializer):
    """Simple serializer for writing invoice items - no invoice FK required"""
    description = serializers.CharField(max_length=300)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'
        extra_kwargs = {'invoice': {'required': False}}


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    customer_name = serializers.ReadOnlyField(source='customer.company_name')
    customer_address = serializers.ReadOnlyField(source='customer.address')
    customer_tax_number = serializers.ReadOnlyField(source='customer.tax_number')
    customer_city = serializers.ReadOnlyField(source='customer.city')
    customer_country = serializers.ReadOnlyField(source='customer.country')
    balance_due = serializers.ReadOnlyField()
    trip_number = serializers.ReadOnlyField(source='trip.trip_number')

    class Meta:
        model = Invoice
        fields = '__all__'


class InvoiceListSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.company_name')
    balance_due = serializers.ReadOnlyField()

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'customer', 'customer_name',
                  'invoice_date', 'due_date', 'status', 'subtotal',
                  'total', 'amount_paid', 'balance_due']


class InvoiceCreateSerializer(serializers.Serializer):
    customer = serializers.IntegerField()
    trip = serializers.IntegerField(required=False, allow_null=True)
    invoice_date = serializers.DateField(required=False)
    due_date = serializers.DateField()
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    items = InvoiceItemWriteSerializer(many=True)

    def create(self, validated_data):
        from .models import Customer, Trip
        items_data = validated_data.pop('items')
        customer_id = validated_data.pop('customer')
        trip_id = validated_data.pop('trip', None)

        customer = Customer.objects.get(id=customer_id)
        trip = Trip.objects.get(id=trip_id) if trip_id else None

        subtotal = sum(
            item['quantity'] * item['unit_price'] for item in items_data
        )

        invoice = Invoice.objects.create(
            customer=customer,
            trip=trip,
            subtotal=subtotal,
            **validated_data
        )

        for item_data in items_data:
            amount = item_data['quantity'] * item_data['unit_price']
            InvoiceItem.objects.create(
                invoice=invoice,
                amount=amount,
                **item_data
            )
        return invoice


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    truck_registration = serializers.ReadOnlyField(source='truck.registration_number')

    class Meta:
        model = MaintenanceRecord
        fields = '__all__'
