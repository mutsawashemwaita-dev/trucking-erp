from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DriverViewSet, TruckViewSet, CustomerViewSet,
    TripViewSet, InvoiceViewSet, MaintenanceRecordViewSet,
    dashboard_stats,
)

router = DefaultRouter()
router.register(r'drivers', DriverViewSet)
router.register(r'trucks', TruckViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'trips', TripViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'maintenance', MaintenanceRecordViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', dashboard_stats, name='dashboard-stats'),
]
