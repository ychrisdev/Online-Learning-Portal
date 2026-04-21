from django.db import transaction as db_transaction
from .models import Wallet, WalletTransaction

INSTRUCTOR_REVENUE_RATE = 0.7  # Giảng viên nhận 70%


def get_or_create_wallet(user):
    wallet, _ = Wallet.objects.get_or_create(user=user)
    return wallet


def deposit(user, amount: int, note: str = 'Nạp tiền') -> Wallet:
    """Nạp tiền vào ví — mock, không qua gateway thật."""
    with db_transaction.atomic():
        wallet = Wallet.objects.select_for_update().get_or_create(user=user)[0]
        wallet.balance += amount
        wallet.save()
        WalletTransaction.objects.create(
            wallet        = wallet,
            tx_type       = WalletTransaction.TxType.DEPOSIT,
            amount        = amount,
            balance_after = wallet.balance,
            note          = note,
        )
    return wallet


def pay_for_course(student, course, amount: int) -> None:
    """
    Trừ tiền ví sinh viên + cộng doanh thu giảng viên.
    Gọi từ payments/views.py sau khi tạo Transaction thành công.
    """
    with db_transaction.atomic():
        # Trừ ví sinh viên
        student_wallet = Wallet.objects.select_for_update().get_or_create(user=student)[0]
        if student_wallet.balance < amount:
            raise ValueError('Số dư ví không đủ.')
        student_wallet.balance -= amount
        student_wallet.save()
        WalletTransaction.objects.create(
            wallet        = student_wallet,
            tx_type       = WalletTransaction.TxType.PAYMENT,
            amount        = -amount,
            balance_after = student_wallet.balance,
            note          = f'Thanh toán khóa học: {course.title}',
            ref_id        = str(course.id),
        )

        # Cộng doanh thu giảng viên
        revenue = int(amount * INSTRUCTOR_REVENUE_RATE)
        instructor_wallet = Wallet.objects.select_for_update().get_or_create(user=course.instructor)[0]
        instructor_wallet.balance += revenue
        instructor_wallet.save()
        WalletTransaction.objects.create(
            wallet        = instructor_wallet,
            tx_type       = WalletTransaction.TxType.REVENUE,
            amount        = revenue,
            balance_after = instructor_wallet.balance,
            note          = f'Doanh thu từ: {course.title}',
            ref_id        = str(course.id),
        )


def refund_to_student(student, amount: int, course_title: str, ref_id: str = '') -> None:
    """Hoàn tiền về ví sinh viên khi admin duyệt refund."""
    with db_transaction.atomic():
        wallet = Wallet.objects.select_for_update().get_or_create(user=student)[0]
        wallet.balance += amount
        wallet.save()
        WalletTransaction.objects.create(
            wallet        = wallet,
            tx_type       = WalletTransaction.TxType.REFUND,
            amount        = amount,
            balance_after = wallet.balance,
            note          = f'Hoàn tiền khóa học: {course_title}',
            ref_id        = ref_id,
        )


def withdraw(user, amount: int, bank_name: str, bank_account: str, account_name: str):
    """Giảng viên yêu cầu rút tiền — trừ ví ngay, tạo WithdrawalRequest pending."""
    from .models import WithdrawalRequest
    with db_transaction.atomic():
        wallet = Wallet.objects.select_for_update().get_or_create(user=user)[0]
        if wallet.balance < amount:
            raise ValueError('Số dư không đủ.')
        wallet.balance -= amount
        wallet.save()
        WalletTransaction.objects.create(
            wallet        = wallet,
            tx_type       = WalletTransaction.TxType.WITHDRAWAL,
            amount        = -amount,
            balance_after = wallet.balance,
            status        = WalletTransaction.Status.PENDING,
            note          = 'Yêu cầu rút tiền',
        )
        return WithdrawalRequest.objects.create(
            wallet       = wallet,
            amount       = amount,
            bank_name    = bank_name,
            bank_account = bank_account,
            account_name = account_name,
        )