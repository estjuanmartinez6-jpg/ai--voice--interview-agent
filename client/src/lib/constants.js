export const JOB_TYPES = [
  {
    id: 'call-center',
    label: 'Call Center',
    icon: '📞',
    description: 'Phone support handling customer inquiries, complaints, and billing issues.',
  },
  {
    id: 'chat-support',
    label: 'Chat Support',
    icon: '💬',
    description: 'Real-time written messaging assisting users with orders, accounts, and queries.',
  },
  {
    id: 'retail',
    label: 'Retail & Store',
    icon: '🛍️',
    description: 'In-person customer assistance, returns, product recommendations, and checkout.',
  },
  {
    id: 'hotel',
    label: 'Hotel & Hospitality',
    icon: '🏨',
    description: 'Front desk guest check-in, concierge services, bookings, and guest dispute resolution.',
  },
  {
    id: 'tech-support',
    label: 'Tech Support',
    icon: '🖥️',
    description: 'Troubleshooting technical issues, connectivity, account setup, and hardware problems.',
  },
];

export const DIFFICULTIES = [
  {
    id: 'friendly',
    label: 'Friendly',
    icon: '😊',
    badge: 'Relaxed',
    description: 'Warm, patient, and encouraging interviewer who guides you with helpful hints.',
  },
  {
    id: 'standard',
    label: 'Standard',
    icon: '📋',
    badge: 'Balanced',
    description: 'Professional, neutral hiring manager with realistic follow-up questions.',
  },
  {
    id: 'tough',
    label: 'Tough',
    icon: '😤',
    badge: 'Challenging',
    description: 'Demanding interviewer who probes deeper, challenges vague answers, and tests pressure.',
  },
];

export const SESSION_LENGTHS = [
  { value: 5, label: '5 min', desc: 'Quick warmup · 4–6 questions' },
  { value: 10, label: '10 min', desc: 'Standard practice · 8–12 questions' },
  { value: 15, label: '15 min', desc: 'Full simulation · 12–16 questions + roleplay' },
];
