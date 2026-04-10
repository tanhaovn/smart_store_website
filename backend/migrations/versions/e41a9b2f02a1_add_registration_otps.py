"""add registration otps

Revision ID: e41a9b2f02a1
Revises: 9aa2c62e8e80
Create Date: 2026-03-30 11:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e41a9b2f02a1'
down_revision = '9aa2c62e8e80'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'registration_otps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('full_name', sa.String(length=120), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('otp_hash', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_registration_otps_email', 'registration_otps', ['email'], unique=False)


def downgrade():
    op.drop_index('ix_registration_otps_email', table_name='registration_otps')
    op.drop_table('registration_otps')
