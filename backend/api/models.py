from django.db import models
from django.utils import timezone


class Driver(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('on_trip', 'On Trip'),
        ('off_duty', 'Off Duty'),
        ('suspended', 'Suspended'),
    ]
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50, unique=True)
    license_expiry = models.DateField()
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    national_id = models.CharField(max_length=50, unique=True)
    address = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    hire_date = models.DateField(default=timezone.now)
    date_of_birth = models.DateField(null=True, blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['last_name', 'first_name']
        db_table = 'drivers'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Truck(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('maintenance', 'In Maintenance'),
        ('retired', 'Retired'),
        ('idle', 'Idle'),
    ]
    FUEL_CHOICES = [
        ('diesel', 'Diesel'),
        ('petrol', 'Petrol'),
        ('electric', 'Electric'),
        ('hybrid', 'Hybrid'),
    ]
    registration_number = models.CharField(max_length=20, unique=True)
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.IntegerField()
    color = models.CharField(max_length=50, blank=True)
    capacity_tons = models.DecimalField(max_digits=8, decimal_places=2)
    fuel_type = models.CharField(max_length=20, choices=FUEL_CHOICES, default='diesel')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    current_driver = models.ForeignKey(
        Driver, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_truck'
    )
    chassis_number = models.CharField(max_length=100, blank=True)
    engine_number = models.CharField(max_length=100, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    fitness_expiry = models.DateField(null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    odometer_km = models.DecimalField(max_digits=10, decimal_places=1, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['registration_number']
        db_table = 'trucks'

    def __str__(self):
        return f"{self.registration_number} — {self.make} {self.model}"


class Customer(models.Model):
    company_name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='Zimbabwe')
    tax_number = models.CharField(max_length=50, blank=True)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_terms_days = models.IntegerField(default=30)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['company_name']
        db_table = 'customers'

    def __str__(self):
        return self.company_name


class Trip(models.Model):
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    trip_number = models.CharField(max_length=50, unique=True)
    truck = models.ForeignKey(Truck, on_delete=models.PROTECT, related_name='trips')
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name='trips')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='trips')
    cargo_description = models.CharField(max_length=300)
    cargo_weight_tons = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    origin = models.CharField(max_length=200)
    destination = models.CharField(max_length=200)
    departure_date = models.DateTimeField()
    arrival_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    distance_km = models.DecimalField(max_digits=8, decimal_places=1, null=True, blank=True)
    freight_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fuel_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_costs = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-departure_date']
        db_table = 'trips'

    def __str__(self):
        return f"{self.trip_number}: {self.origin} → {self.destination}"

    @property
    def total_cost(self):
        return self.fuel_cost + self.other_costs

    @property
    def profit(self):
        return self.freight_amount - self.total_cost

    def save(self, *args, **kwargs):
        if not self.trip_number:
            last = Trip.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            self.trip_number = f"TRP-{num:05d}"
        super().save(*args, **kwargs)


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    invoice_number = models.CharField(max_length=50, unique=True)
    trip = models.OneToOneField(Trip, null=True, blank=True, on_delete=models.SET_NULL, related_name='invoice')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='invoices')
    invoice_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateField(null=True, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-invoice_date', '-id']
        db_table = 'invoices'

    def __str__(self):
        return self.invoice_number

    @property
    def balance_due(self):
        return self.total - self.amount_paid

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            last = Invoice.objects.order_by('-id').first()
            num = (last.id + 1) if last else 1
            self.invoice_number = f"INV-{num:05d}"
        from decimal import Decimal
        self.tax_amount = self.subtotal * (Decimal(str(self.tax_rate)) / Decimal("100"))
        self.total = self.subtotal + self.tax_amount
        super().save(*args, **kwargs)


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=300)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'invoice_items'

    def save(self, *args, **kwargs):
        self.amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class MaintenanceRecord(models.Model):
    TYPE_CHOICES = [
        ('service', 'Routine Service'),
        ('repair', 'Repair'),
        ('tyre', 'Tyre Replacement'),
        ('inspection', 'Inspection'),
        ('other', 'Other'),
    ]
    truck = models.ForeignKey(Truck, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField()
    date = models.DateField(default=timezone.now)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    odometer_at_service = models.DecimalField(max_digits=10, decimal_places=1, null=True, blank=True)
    next_service_km = models.DecimalField(max_digits=10, decimal_places=1, null=True, blank=True)
    service_provider = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        db_table = 'maintenance_records'

    def __str__(self):
        return f"{self.truck.registration_number} — {self.get_maintenance_type_display()} on {self.date}"
