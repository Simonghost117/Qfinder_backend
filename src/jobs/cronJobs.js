import { MedicationNotificationService } from '../firebaseServices/medication.service.js';
import { AppointmentNotificationService } from '../firebaseServices/cita.service.js';
import { ActivityNotificationService } from '../firebaseServices/activity.service.js';
import { ChatNotificationService } from '../firebaseServices/chat.service.js';

export function startAllJobs() {
  // Iniciar todos los servicios de notificación
  MedicationNotificationService.start();
  AppointmentNotificationService.start();
  ActivityNotificationService.start();
  ChatNotificationService.setupListeners();
  
  console.log('All notification jobs started');
}