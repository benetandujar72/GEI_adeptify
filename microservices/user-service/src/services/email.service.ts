import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import { db } from '../database/connection.js';
import { emailTemplates, emailLogs } from '../database/schema.js';
import { eq } from 'drizzle-orm';

// ===== CONFIGURACIÓN DE EMAIL =====

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables?: Record<string, any>;
}

interface EmailData {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  userId?: string;
  templateId?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private defaultFrom: string;

  constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@eduai-platform.com';
    
    // Configuración del transporter
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.transporter = nodemailer.createTransporter(emailConfig);
    
    // Verificar conexión
    this.verifyConnection();
  }

  /**
   * Verifica la conexión del transporter
   */
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified successfully');
    } catch (error) {
      logger.error('Email service connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Envía un email
   */
  async sendEmail(emailData: EmailData): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Preparar opciones del email
      const mailOptions = {
        from: this.defaultFrom,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.htmlBody,
        text: emailData.textBody
      };

      // Enviar email
      const info = await this.transporter.sendMail(mailOptions);
      
      // Registrar en logs
      await this.logEmail({
        userId: emailData.userId,
        templateId: emailData.templateId,
        to: emailData.to,
        subject: emailData.subject,
        htmlBody: emailData.htmlBody,
        textBody: emailData.textBody,
        status: 'sent',
        sentAt: new Date(),
        messageId: info.messageId
      });

      const duration = Date.now() - startTime;
      logger.info('Email sent successfully', {
        to: emailData.to,
        subject: emailData.subject,
        messageId: info.messageId,
        duration
      });

      return true;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Registrar error en logs
      await this.logEmail({
        userId: emailData.userId,
        templateId: emailData.templateId,
        to: emailData.to,
        subject: emailData.subject,
        htmlBody: emailData.htmlBody,
        textBody: emailData.textBody,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error('Failed to send email', {
        to: emailData.to,
        subject: emailData.subject,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return false;
    }
  }

  /**
   * Envía email de verificación
   */
  async sendEmailVerification(email: string, token: string): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const emailData: EmailData = {
      to: email,
      subject: 'Verifica tu cuenta - EduAI Platform',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">¡Bienvenido a EduAI Platform!</h2>
          <p>Gracias por registrarte. Para completar tu registro, por favor verifica tu dirección de email haciendo clic en el siguiente enlace:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verificar Email
            </a>
          </p>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>Este enlace expirará en 24 horas.</p>
          <p>Si no creaste esta cuenta, puedes ignorar este email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Este es un email automático, por favor no respondas a este mensaje.
          </p>
        </div>
      `,
      textBody: `
        ¡Bienvenido a EduAI Platform!
        
        Gracias por registrarte. Para completar tu registro, por favor verifica tu dirección de email visitando el siguiente enlace:
        
        ${verificationUrl}
        
        Este enlace expirará en 24 horas.
        
        Si no creaste esta cuenta, puedes ignorar este email.
        
        ---
        Este es un email automático, por favor no respondas a este mensaje.
      `
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Envía email de reset de contraseña
   */
  async sendPasswordReset(email: string, token: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const emailData: EmailData = {
      to: email,
      subject: 'Reset de Contraseña - EduAI Platform',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset de Contraseña</h2>
          <p>Has solicitado resetear tu contraseña. Para continuar, haz clic en el siguiente enlace:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Resetear Contraseña
            </a>
          </p>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>Este enlace expirará en 1 hora.</p>
          <p>Si no solicitaste este reset, puedes ignorar este email. Tu contraseña permanecerá sin cambios.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Este es un email automático, por favor no respondas a este mensaje.
          </p>
        </div>
      `,
      textBody: `
        Reset de Contraseña - EduAI Platform
        
        Has solicitado resetear tu contraseña. Para continuar, visita el siguiente enlace:
        
        ${resetUrl}
        
        Este enlace expirará en 1 hora.
        
        Si no solicitaste este reset, puedes ignorar este email. Tu contraseña permanecerá sin cambios.
        
        ---
        Este es un email automático, por favor no respondas a este mensaje.
      `
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Envía email de bienvenida
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    const emailData: EmailData = {
      to: email,
      subject: '¡Bienvenido a EduAI Platform!',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">¡Bienvenido, ${firstName}!</h2>
          <p>Tu cuenta ha sido verificada exitosamente. Ya puedes acceder a todas las funcionalidades de EduAI Platform.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
               style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Ir al Dashboard
            </a>
          </p>
          <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Este es un email automático, por favor no respondas a este mensaje.
          </p>
        </div>
      `,
      textBody: `
        ¡Bienvenido, ${firstName}!
        
        Tu cuenta ha sido verificada exitosamente. Ya puedes acceder a todas las funcionalidades de EduAI Platform.
        
        Visita tu dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard
        
        Si tienes alguna pregunta, no dudes en contactarnos.
        
        ---
        Este es un email automático, por favor no respondas a este mensaje.
      `
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Envía email de notificación de seguridad
   */
  async sendSecurityAlert(email: string, alertType: string, details: any): Promise<boolean> {
    const emailData: EmailData = {
      to: email,
      subject: `Alerta de Seguridad - ${alertType}`,
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">Alerta de Seguridad</h2>
          <p>Se ha detectado una actividad sospechosa en tu cuenta:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Tipo:</strong> ${alertType}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>IP:</strong> ${details.ipAddress || 'Desconocida'}</p>
            <p><strong>Dispositivo:</strong> ${details.userAgent || 'Desconocido'}</p>
          </div>
          <p>Si no reconoces esta actividad, por favor cambia tu contraseña inmediatamente.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/security" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Revisar Seguridad
            </a>
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Este es un email automático, por favor no respondas a este mensaje.
          </p>
        </div>
      `,
      textBody: `
        Alerta de Seguridad - ${alertType}
        
        Se ha detectado una actividad sospechosa en tu cuenta:
        
        Tipo: ${alertType}
        Fecha: ${new Date().toLocaleString()}
        IP: ${details.ipAddress || 'Desconocida'}
        Dispositivo: ${details.userAgent || 'Desconocido'}
        
        Si no reconoces esta actividad, por favor cambia tu contraseña inmediatamente.
        
        Revisar configuración de seguridad: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/security
        
        ---
        Este es un email automático, por favor no respondas a este mensaje.
      `
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Registra un email en la base de datos
   */
  private async logEmail(logData: {
    userId?: string;
    templateId?: string;
    to: string;
    subject: string;
    htmlBody?: string;
    textBody?: string;
    status: string;
    sentAt?: Date;
    errorMessage?: string;
    messageId?: string;
  }): Promise<void> {
    try {
      await db.insert(emailLogs).values({
        userId: logData.userId,
        templateId: logData.templateId,
        to: logData.to,
        subject: logData.subject,
        htmlBody: logData.htmlBody,
        textBody: logData.textBody,
        status: logData.status,
        sentAt: logData.sentAt,
        errorMessage: logData.errorMessage
      });
    } catch (error) {
      logger.error('Failed to log email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        logData
      });
    }
  }

  /**
   * Obtiene estadísticas de emails
   */
  async getEmailStats(): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
  }> {
    try {
      const stats = await db
        .select({
          status: emailLogs.status,
          count: db.fn.count()
        })
        .from(emailLogs)
        .groupBy(emailLogs.status);

      const result = {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0
      };

      stats.forEach(stat => {
        const count = parseInt(stat.count as string);
        result.total += count;
        
        switch (stat.status) {
          case 'sent':
            result.sent = count;
            break;
          case 'failed':
            result.failed = count;
            break;
          case 'pending':
            result.pending = count;
            break;
        }
      });

      return result;
    } catch (error) {
      logger.error('Failed to get email stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0
      };
    }
  }

  /**
   * Obtiene logs de emails recientes
   */
  async getRecentEmailLogs(limit: number = 10): Promise<any[]> {
    try {
      return await db
        .select()
        .from(emailLogs)
        .orderBy(emailLogs.createdAt)
        .limit(limit);
    } catch (error) {
      logger.error('Failed to get recent email logs', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }
}

export default EmailService; 