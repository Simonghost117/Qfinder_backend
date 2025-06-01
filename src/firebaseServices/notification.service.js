import { messaging } from '../config/firebase-admin.js';
import logger from '../utils/logger.js';
import Usuario from '../models/usuario.model.js';
import { Op } from 'sequelize';
export class NotificationService {
  /**
   * Envía una notificación push a un dispositivo específico
   */
  static async sendPushNotification({ token, title, body, data = {}, imageUrl }) {
    if (!token) {
      logger.warn('No FCM token provided, skipping notification');
      return null;
    }

    // Validar el token antes de usarlo
    const isValid = await this.validateToken(token);
    if (!isValid) {
      logger.warn(`Invalid token ${token.substring(0, 10)}..., skipping notification`);
      await this.removeInvalidToken(token);
      return null;
    }

    try {
      const message = {
        token,
        notification: { 
          title,
          body,
          ...(imageUrl && { image: imageUrl })
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
        }
      };

      const response = await messaging.send(message);
      logger.info(`Notification sent successfully to ${token.substring(0, 10)}...`, { 
        messageId: response 
      });
      return response;
    } catch (error) {
      await this.handleNotificationError(error, token);
      throw error;
    }
  }

  /**
   * Envía notificaciones a múltiples dispositivos con manejo de errores
   */
  static async sendToMultiple(tokens, { title, body, data = {}, imageUrl }) {
    if (!tokens || tokens.length === 0) {
      logger.warn('No FCM tokens provided for multiple send');
      return { successCount: 0, failureCount: 0 };
    }

    // Filtrar tokens válidos
    const validTokens = [];
    const invalidTokens = [];

    for (const token of tokens) {
      if (await this.validateToken(token)) {
        validTokens.push(token);
      } else {
        invalidTokens.push(token);
      }
    }

    // Eliminar tokens inválidos de la base de datos
    if (invalidTokens.length > 0) {
      await this.removeInvalidTokens(invalidTokens);
    }

    if (validTokens.length === 0) {
      return { successCount: 0, failureCount: tokens.length };
    }

    // Enviar en lotes de 500 (límite de Firebase)
    const batchSize = 500;
    const results = [];

    for (let i = 0; i < validTokens.length; i += batchSize) {
      const batch = validTokens.slice(i, i + batchSize);
      
      try {
        const message = {
          tokens: batch,
          notification: { title, body },
          data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              ...(imageUrl && { image: imageUrl })
            }
          }
        };

        const response = await messaging.sendEachForMulticast(message);
        results.push(response);

        // Procesar respuestas para manejar errores específicos
        this.processBatchResponse(batch, response);
        
      } catch (error) {
        logger.error('Error in batch send:', error);
        results.push({ error: error.message });
      }
    }

    return this.aggregateResults(results, tokens.length);
  }

  /**
   * Valida un token FCM
   */
  static async validateToken(token) {
    try {
      // Envía una notificación de prueba (solo validación)
      await messaging.send({
        token,
        data: { validation: 'true' }
      }, true); // El segundo parámetro true indica que es solo validación
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Maneja errores de notificación
   */
  static async handleNotificationError(error, token) {
    logger.error('Error sending notification:', error);
    
    if (this.isTokenError(error)) {
      logger.warn(`Removing invalid FCM token: ${token.substring(0, 10)}...`);
      await this.removeInvalidToken(token);
    }
  }

  /**
   * Verifica si el error es relacionado con tokens inválidos
   */
  static isTokenError(error) {
    const tokenErrors = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/mismatched-credential'
    ];
    return tokenErrors.includes(error.code);
  }

  /**
   * Elimina tokens inválidos de la base de datos
   */
  static async removeInvalidToken(token) {
    try {
      await Usuario.update(
        { fcm_token: null },
        { where: { fcm_token: token } }
      );
      logger.info(`Invalid token removed from database`);
    } catch (dbError) {
      logger.error('Error removing invalid token from database:', dbError);
    }
  }

  static async removeInvalidTokens(tokens) {
    try {
      await Usuario.update(
        { fcm_token: null },
        { where: { fcm_token: { [Op.in]: tokens } } }
      );
      logger.info(`Removed ${tokens.length} invalid tokens from database`);
    } catch (error) {
      logger.error('Error removing invalid tokens:', error);
    }
  }

  /**
   * Procesa la respuesta de un envío por lotes
   */
  static async processBatchResponse(tokens, response) {
    const invalidTokens = [];
    
    response.responses.forEach((resp, index) => {
      if (!resp.success && this.isTokenError(resp.error)) {
        const token = tokens[index];
        invalidTokens.push(token);
        logger.warn(`Invalid token detected: ${token.substring(0, 10)}...`);
      }
    });

    if (invalidTokens.length > 0) {
      await this.removeInvalidTokens(invalidTokens);
    }
  }

  /**
   * Agrega resultados de múltiples lotes
   */
  static aggregateResults(results, totalTokens) {
    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    results.forEach(result => {
      if (result.error) {
        failureCount += result.tokens?.length || 1;
        errors.push(result.error);
      } else {
        successCount += result.successCount;
        failureCount += result.failureCount;
      }
    });

    return {
      successCount,
      failureCount,
      totalTokens,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}