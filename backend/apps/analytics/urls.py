from django.urls import path

from .views import InstructorAnalyticsView

urlpatterns = [
    path("analytics/instructor/", InstructorAnalyticsView.as_view(), name="analytics-instructor"),
]
