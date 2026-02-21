from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_alter_deceasedreport_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='deceasedreport',
            name='confirmed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='deceasedreport',
            name='confirmed_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='confirmed_deceased_reports', to='core.user'),
        ),
        migrations.AddField(
            model_name='deceasedreport',
            name='confirmed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
