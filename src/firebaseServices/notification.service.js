import { messaging } from '../config/firebase-admin.js';

export class NotificationService {
  static async sendPushNotification({ token, title, body, data = {} }) {
    if (!token) {
      console.warn('No FCM token provided, skipping notification');
      return;
    }

    try {
      const message = {
        token,
        notification: { title, body },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'default_channel'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        }
      };

      await messaging.send(message);
      console.log(`Notification sent successfully to ${token.substring(0, 10)}...`);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  static async sendToTopic(topic, { title, body, data = {} }) {
    try {
      const message = {
        topic,
        notification: { title, body },
        data,
        android: {
          priority: 'high'
        }
      };

      await messaging.send(message);
      console.log(`Notification sent successfully to topic ${topic}`);
    } catch (error) {
      console.error('Error sending topic notification:', error);
      throw error;
    }
  }
}