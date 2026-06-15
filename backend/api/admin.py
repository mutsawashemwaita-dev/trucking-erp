from django.contrib import admin
from .models import Driver, Truck, Customer, Trip, Invoice, InvoiceItem, MaintenanceRecord


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'license_number', 'phone', 'status', 'hire_date']
    list_filter = ['status']
    search_fields = ['first_name', 'last_name', 'license_number']


@admin.register(Truck)
class TruckAdmin(admin.ModelAdmin):
    list_display = ['registration_number', 'make', 'model', 'year', 'status', 'current_driver']
    list_filter = ['status', 'make']
    search_fields = ['registration_number', 'make', 'model']


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'contact_person', 'email', 'city', 'country', 'is_active']
    list_filter = ['is_active', 'country']
    search_fields = ['company_name', 'contact_person', 'email']


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ['trip_number', 'truck', 'driver', 'customer', 'origin', 'destination', 'status', 'freight_amount']
    list_filter = ['status']
    search_fields = ['trip_number', 'cargo_description', 'origin', 'destination']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer', 'invoice_date', 'due_date', 'total', 'status']
    list_filter = ['status']
    inlines = [InvoiceItemInline]


@admin.register(MaintenanceRecord)
class MaintenanceAdmin(admin.ModelAdmin):
    list_display = ['truck', 'maintenance_type', 'date', 'cost', 'service_provider']
    list_filter = ['maintenance_type']
