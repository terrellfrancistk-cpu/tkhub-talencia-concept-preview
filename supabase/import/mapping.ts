/**
 * Legacy field mapping. The old Talencia/KAD app's export format isn't documented, so every field is
 * looked up by a list of candidate names (first match wins, case-insensitive, dots reach into nested objects).
 * Adjust these lists once a real export is available; the adapter logic does not need to change.
 */
export const FIELDS = {
  organization: {
    id: ['id', 'client_id', 'clientId', 'office_id', 'practice_id', 'account_id'],
    name: ['name', 'practice_name', 'office_name', 'company', 'client_name', 'business_name'],
    kind: ['type', 'kind', 'practice_type', 'specialty', 'vertical', 'industry_type'],
    industry: ['industry', 'sector'],
    eor: ['eor', 'is_eor', 'employer_of_record', 'service_type'],
    city: ['city', 'address.city', 'location.city'],
    state: ['state', 'address.state', 'location.state', 'region'],
  },
  person: {
    id: ['id', 'user_id', 'userId', 'talent_id', 'worker_id', 'employee_id', 'contact_id'],
    email: ['email', 'email_address', 'emailAddress', 'login', 'username'],
    firstName: ['first_name', 'firstName', 'fname', 'given_name'],
    lastName: ['last_name', 'lastName', 'lname', 'family_name', 'surname'],
    fullName: ['name', 'full_name', 'fullName', 'display_name'],
    phone: ['phone', 'phone_number', 'mobile', 'cell', 'phoneNumber'],
    type: ['type', 'role', 'user_type', 'account_type'],
    orgId: ['client_id', 'clientId', 'office_id', 'practice_id', 'organization_id', 'account_id'],
    orgRole: ['org_role', 'permission', 'access_level'],
  },
  shift: {
    id: ['id', 'shift_id', 'booking_id', 'assignment_id'],
    orgId: ['client_id', 'clientId', 'office_id', 'practice_id', 'organization_id'],
    personId: ['talent_id', 'worker_id', 'employee_id', 'professional_id', 'assigned_to', 'user_id'],
    role: ['position', 'role', 'job_title', 'title', 'specialty'],
    date: ['date', 'shift_date', 'work_date'],
    start: ['start', 'start_time', 'starts_at', 'startTime', 'start_datetime'],
    end: ['end', 'end_time', 'ends_at', 'endTime', 'end_datetime'],
    rate: ['rate', 'pay_rate', 'hourly_rate', 'bill_rate', 'wage'],
    status: ['status', 'state', 'shift_status'],
    engagement: ['type', 'assignment_type', 'engagement', 'placement_type'],
  },
  timesheet: {
    id: ['id', 'timesheet_id', 'punch_id'],
    shiftId: ['shift_id', 'booking_id', 'assignment_id'],
    personId: ['talent_id', 'worker_id', 'employee_id', 'professional_id', 'user_id'],
    orgId: ['client_id', 'office_id', 'practice_id', 'organization_id'],
    clockIn: ['clock_in', 'time_in', 'in', 'punch_in', 'start'],
    clockOut: ['clock_out', 'time_out', 'out', 'punch_out', 'end'],
    breakMinutes: ['break_minutes', 'lunch_minutes', 'break', 'unpaid_break'],
    status: ['status', 'approval_status', 'state'],
  },
  invoice: {
    id: ['id', 'invoice_id'],
    number: ['number', 'invoice_number', 'invoice_no', 'ref'],
    orgId: ['client_id', 'office_id', 'practice_id', 'organization_id'],
    periodStart: ['period_start', 'week_start', 'from', 'start_date'],
    periodEnd: ['period_end', 'week_end', 'to', 'end_date'],
    total: ['total', 'amount', 'total_amount', 'balance', 'amount_due'],
    status: ['status', 'state', 'payment_status'],
    dueOn: ['due', 'due_date', 'due_on'],
    paidAt: ['paid_at', 'paid_date', 'payment_date'],
  },
  credential: {
    id: ['id', 'credential_id', 'document_id'],
    personId: ['talent_id', 'worker_id', 'employee_id', 'professional_id', 'user_id'],
    kind: ['type', 'kind', 'document_type', 'credential_type', 'name'],
    number: ['number', 'license_number', 'license_no', 'id_number'],
    state: ['state', 'issuing_state', 'jurisdiction'],
    expiresOn: ['expires', 'expiration', 'expiration_date', 'expires_on', 'exp_date'],
    status: ['status', 'verification_status', 'state_status'],
  },
  reward: {
    id: ['id', 'transaction_id', 'entry_id'],
    personId: ['talent_id', 'worker_id', 'user_id', 'professional_id'],
    orgId: ['client_id', 'office_id', 'organization_id'],
    points: ['points', 'amount', 'value', 'pts'],
    reason: ['reason', 'description', 'memo', 'note'],
    createdAt: ['created_at', 'date', 'timestamp', 'earned_at'],
  },
} as const;

/** Legacy status words → new status values. Unknown words fall back to the default and are reported. */
export const STATUS = {
  shift: { default: 'open', map: { open: 'open', posted: 'open', available: 'open', pending: 'open', claimed: 'claimed', accepted: 'claimed', booked: 'confirmed', confirmed: 'confirmed', scheduled: 'confirmed', filled: 'filled', worked: 'completed', completed: 'completed', complete: 'completed', done: 'completed', cancelled: 'cancelled', canceled: 'cancelled', void: 'cancelled' } },
  timesheet: { default: 'submitted', map: { open: 'open', 'in progress': 'open', submitted: 'submitted', pending: 'submitted', approved: 'approved', paid: 'approved', disputed: 'disputed', rejected: 'disputed' } },
  invoice: { default: 'open', map: { open: 'open', unpaid: 'open', due: 'open', overdue: 'open', sent: 'open', paid: 'paid', settled: 'paid', void: 'void', voided: 'void', cancelled: 'void', canceled: 'void' } },
  credential: { default: 'pending', map: { pending: 'pending', submitted: 'pending', 'in review': 'pending', verified: 'verified', approved: 'verified', active: 'verified', valid: 'verified', expired: 'expired', missing: 'missing', required: 'missing' } },
} as const;

/** Legacy person type → role. Anything not recognised is reported and skipped. */
export const ROLE: Record<string, 'practice' | 'professional'> = {
  client: 'practice', practice: 'practice', office: 'practice', employer: 'practice', manager: 'practice', admin: 'practice',
  talent: 'professional', professional: 'professional', worker: 'professional', employee: 'professional', temp: 'professional',
  hygienist: 'professional', assistant: 'professional', dentist: 'professional', candidate: 'professional',
};
