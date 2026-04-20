from celery import shared_task
from django.utils import timezone


@shared_task
def auto_complete_expired_campaigns():
    """
    Periodic task: auto-complete campaigns that have passed their end_date.
    Run this daily via Celery Beat.
    """
    from .models import Campaign, CampaignStatus

    today = timezone.now().date()
    expired = Campaign.objects.filter(
        status=CampaignStatus.ACTIVE,
        end_date__lt=today,
    )
    count = expired.count()
    expired.update(status=CampaignStatus.COMPLETED)
    return f"Auto-completed {count} campaigns."


@shared_task
def update_campaign_raised_amount(campaign_id):
    """
    Recalculate a campaign's raised_amount from all confirmed donations.
    Called after each successful donation (Step 05).
    """
    from .models import Campaign
    from django.db.models import Sum

    try:
        campaign = Campaign.objects.get(id=campaign_id)
    except Campaign.DoesNotExist:
        return

    pass