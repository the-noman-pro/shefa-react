from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Donation


@receiver(post_save, sender=Donation)
def update_campaign_stats(sender, instance, created, **kwargs):
    """After a confirmed donation is saved, update campaign and charity stats."""
    if instance.is_confirmed:
        from django.db.models import Sum
        campaign = instance.campaign

        agg = Donation.objects.filter(
            campaign=campaign,
            is_confirmed=True,
        ).aggregate(total=Sum('amount'))

        campaign.raised_amount = agg['total'] or 0
        campaign.donors_count = Donation.objects.filter(
            campaign=campaign,
            is_confirmed=True,
            is_anonymous=False,
        ).values('user').distinct().count()
        campaign.save(update_fields=['raised_amount', 'donors_count', 'updated_at'])

        # Also update charity total_raised
        charity = campaign.charity
        total = Donation.objects.filter(
            campaign__charity=charity,
            is_confirmed=True,
        ).aggregate(total=Sum('amount'))['total'] or 0
        charity.total_raised = total
        charity.save(update_fields=['total_raised', 'updated_at'])