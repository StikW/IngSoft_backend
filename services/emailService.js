const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configurar transporter de nodemailer
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  // Verificar conexión con el servidor de email
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Servidor de email listo');
      return true;
    } catch (error) {
      console.error('❌ Error verificando servidor de email:', error);
      return false;
    }
  }

  // Enviar email de confirmación de registro
  async sendRegistrationConfirmation(userData) {
    const { nombre, correo, rol } = userData;

    const mailOptions = {
      from: `"SIGEU - Sistema de Gestión de Eventos Universitarios" <${process.env.SMTP_USER}>`,
      to: correo,
      subject: '✅ Registro Exitoso - SIGEU',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .info-box {
              background-color: white;
              padding: 15px;
              border-left: 4px solid #4CAF50;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>¡Bienvenido a SIGEU!</h1>
          </div>
          <div class="content">
            <p>Estimado/a <strong>${nombre}</strong>,</p>
            
            <p>Nos complace informarte que tu registro en el <strong>Sistema de Gestión de Eventos Universitarios (SIGEU)</strong> ha sido exitoso.</p>
            
            <div class="info-box">
              <h3>📋 Información de tu cuenta:</h3>
              <p><strong>Nombre:</strong> ${nombre}</p>
              <p><strong>Correo electrónico:</strong> ${correo}</p>
              <p><strong>Rol:</strong> ${rol}</p>
            </div>
            
            <p>Ya puedes iniciar sesión en el sistema y comenzar a gestionar tus eventos universitarios.</p>
            
            <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
            
            <p>¡Esperamos que disfrutes usando SIGEU!</p>
            
            <p>Saludos cordiales,<br>
            <strong>Equipo SIGEU</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
            <p>SIGEU - Sistema de Gestión de Eventos Universitarios</p>
          </div>
        </body>
        </html>
      `,
      text: `
        ¡Bienvenido a SIGEU!
        
        Estimado/a ${nombre},
        
        Nos complace informarte que tu registro en el Sistema de Gestión de Eventos Universitarios (SIGEU) ha sido exitoso.
        
        Información de tu cuenta:
        - Nombre: ${nombre}
        - Correo electrónico: ${correo}
        - Rol: ${rol}
        
        Ya puedes iniciar sesión en el sistema y comenzar a gestionar tus eventos universitarios.
        
        Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.
        
        ¡Esperamos que disfrutes usando SIGEU!
        
        Saludos cordiales,
        Equipo SIGEU
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de confirmación enviado a:', correo);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error enviando email de confirmación:', error);
      throw new Error('Error al enviar email de confirmación');
    }
  }

  // Enviar credenciales por email (recuperación de contraseña)
  async sendCredentialsRecovery(userData, temporaryPassword) {
    const { nombre, correo, rol } = userData;

    const mailOptions = {
      from: `"SIGEU - Sistema de Gestión de Eventos Universitarios" <${process.env.SMTP_USER}>`,
      to: correo,
      subject: '🔐 Recuperación de Credenciales - SIGEU',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #2196F3;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .credentials-box {
              background-color: white;
              padding: 20px;
              border: 2px solid #2196F3;
              border-radius: 5px;
              margin: 20px 0;
              text-align: center;
            }
            .credential-item {
              margin: 15px 0;
              padding: 10px;
              background-color: #f0f0f0;
              border-radius: 3px;
            }
            .password {
              font-size: 18px;
              font-weight: bold;
              color: #2196F3;
              letter-spacing: 2px;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 Recuperación de Credenciales</h1>
          </div>
          <div class="content">
            <p>Estimado/a <strong>${nombre}</strong>,</p>
            
            <p>Hemos recibido tu solicitud de recuperación de credenciales para tu cuenta en SIGEU.</p>
            
            <div class="credentials-box">
              <h3>📋 Tus Credenciales de Acceso:</h3>
              <div class="credential-item">
                <strong>Usuario (Correo):</strong><br>
                ${correo}
              </div>
              <div class="credential-item">
                <strong>Contraseña Temporal:</strong><br>
                <span class="password">${temporaryPassword}</span>
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul style="text-align: left; margin: 10px 0;">
                <li>Esta es una contraseña temporal generada automáticamente.</li>
                <li>Te recomendamos cambiar esta contraseña después de iniciar sesión por seguridad.</li>
                <li>Puedes cambiar tu contraseña desde el menú de "Editar Perfil" una vez que hayas iniciado sesión.</li>
              </ul>
            </div>
            
            <p>Por favor, inicia sesión con estas credenciales y cambia tu contraseña lo antes posible.</p>
            
            <p>Si no solicitaste esta recuperación de credenciales, por favor contacta al administrador del sistema inmediatamente.</p>
            
            <p>Saludos cordiales,<br>
            <strong>Equipo SIGEU</strong></p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
            <p>SIGEU - Sistema de Gestión de Eventos Universitarios</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Recuperación de Credenciales - SIGEU
        
        Estimado/a ${nombre},
        
        Hemos recibido tu solicitud de recuperación de credenciales para tu cuenta en SIGEU.
        
        Tus Credenciales de Acceso:
        - Usuario (Correo): ${correo}
        - Contraseña Temporal: ${temporaryPassword}
        
        IMPORTANTE:
        - Esta es una contraseña temporal generada automáticamente.
        - Te recomendamos cambiar esta contraseña después de iniciar sesión por seguridad.
        - Puedes cambiar tu contraseña desde el menú de "Editar Perfil" una vez que hayas iniciado sesión.
        
        Por favor, inicia sesión con estas credenciales y cambia tu contraseña lo antes posible.
        
        Si no solicitaste esta recuperación de credenciales, por favor contacta al administrador del sistema inmediatamente.
        
        Saludos cordiales,
        Equipo SIGEU
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de recuperación de credenciales enviado a:', correo);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error enviando email de recuperación:', error);
      throw new Error('Error al enviar email de recuperación de credenciales');
    }
  }
}

module.exports = new EmailService();

