import { messaging } from '../config/firebase-admin.js';
import logger from '../utils/logger.js';

export class NotificationService {
  static async sendPushNotification({ token, title, body, data = {}, imageUrl }) {
    if (!token) {
      logger.warn('No FCM token provided, skipping notification');
      return;
    }

    try {
      const message = {
        token,
        notification: { 
          title,
          body,
          ...(imageUrl && { imageUrl }) // Solo incluir imageUrl si está presente
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'default_channel',
            ...(imageUrl && { image: imageUrl })
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              ...(imageUrl && { 'mutable-content': 1 })
            }
          }
        },
        ...(imageUrl && {
          webpush: {
            headers: {
              image: imageUrl
            }
          }
        })
      };

      const response = await messaging.send(message);
      logger.info(`Notification sent successfully to ${token.substring(0, 10)}...`, { messageId: response });
      return response;
    } catch (error) {
      logger.error('Error sending notification:', error);
      
      // Manejo específico de tokens inválidos/no registrados
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        logger.warn('Removing invalid FCM token');
        // Aquí deberías eliminar el token de tu base de datos
        // Ejemplo: await UserModel.removeFcmToken(token);
      }
      
      throw error;
    }
  }

  static async sendToTopic(topic, { title, body, data = {}, imageUrl }) {
    try {
      const message = {
        topic,
        notification: { 
          title, 
          body,
          ...(imageUrl && { imageUrl })
        },
        data,
        android: {
          priority: 'high',
          ...(imageUrl && {
            notification: {
              image: imageUrl
            }
          })
        },
        ...(imageUrl && {
          apns: {
            payload: {
              aps: {
                'mutable-content': 1
              }
            }
          }
        })
      };

      const response = await messaging.send(message);
      logger.info(`Notification sent successfully to topic ${topic}`, { messageId: response });
      return response;
    } catch (error) {
      logger.error('Error sending topic notification:', error);
      throw error;
    }
  }

  static async sendToMultiple(tokens, { title, body, data = {}, imageUrl }) {
    if (!tokens || tokens.length === 0) {
      logger.warn('No FCM tokens provided for multiple send');
      return;
    }

    // Firebase limita a 500 tokens por lote
    const batchSize = 500;
    const batches = [];
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      batches.push(tokens.slice(i, i + batchSize));
    }

    const results = [];
    for (const batch of batches) {
      try {
        const message = {
          tokens: batch,
          notification: { 
            title, 
            body,
            ...(imageUrl && { imageUrl })
          },
          data,
          android: { 
            priority: 'high',
            ...(imageUrl && {
              notification: {
                image: imageUrl
              }
            })
          }
        };

        const response = await messaging.sendEachForMulticast(message);
        results.push({
          successCount: response.successCount,
          failureCount: response.failureCount,
          responses: response.responses
        });

        // Manejar tokens inválidos
        response.responses.forEach((resp, index) => {
          if (!resp.success) {
            const token = batch[index];
            logger.warn(`Failed to send to token ${token.substring(0, 10)}...: ${resp.error?.message}`);
            
            if (resp.error?.code === 'messaging/invalid-registration-token' || 
                resp.error?.code === 'messaging/registration-token-not-registered') {
              // Eliminar token inválido de la base de datos
              // Ejemplo: await UserModel.removeFcmToken(token);
            }
          }
        });
      } catch (error) {
        logger.error('Error in batch send:', error);
        results.push({ error: error.message });
      }
    }

    return results;
  }

  // Método adicional para manejar la limpieza de tokens inválidos
  static async cleanInvalidTokens(tokens) {
    const validTokens = [];
    const invalidTokens = [];
    
    // Verificar cada token (puedes implementar lógica más sofisticada)
    for (const token of tokens) {
      try {
        // Intenta enviar una notificación de prueba
        await messaging.send({
          token,
          data: { test: '1' },
          android: { priority: 'high' }
        }, true); // El segundo parámetro indica que es un test
        validTokens.push(token);
      } catch (error) {
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(token);
        }
      }
    }
    
    return { validTokens, invalidTokens };
  }
}