export interface Participant {
  id: string;
  name: string;
  age: number;
  cpf: string;
  nucleus: string;
  whatsapp: string;
  group: string;
  registeredAt: string;
  points: number;
  totalSessions?: number;
  attendancePercentage?: number;
}

export interface AttendanceRecord {
  id: string;
  participantId: string;
  groupId: string;
  date: string;
  topic: string;
  responsibleName: string;
  points: number;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  description: string;
  icon: string;
}

export interface AttendanceSession {
  id: string;
  groupId: string;
  date: string;
  topic: string;
  responsibleName: string;
  attendees: string[];
  pointsPerParticipant: number;
}

export interface Notification {
  id: string;
  type: 'new_registration' | 'attendance' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}