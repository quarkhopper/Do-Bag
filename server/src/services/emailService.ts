// Mock email service for development
// This replaces the nodemailer implementation to avoid dependency issues

// Mock email configuration
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@dobag.com';

// Mock transporter
let emailTransporter: any = null;

// Initialize the email transporter
export async function initializeEmailService() {
  console.log('Mock Email service initialized');
  emailTransporter = {
    sendMail: async (options: any) => {
      console.log('====== MOCK EMAIL SENT ======');
      console.log('From:', options.from);
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Text:', options.text);
      console.log('============================');
      
      return { 
        messageId: `mock-${Date.now()}`,
        envelope: { from: options.from, to: options.to }
      };
    }
  };
  
  return emailTransporter;
}

// Send verification email
export async function sendVerificationEmail(
  email: string, 
  verificationToken: string,
  baseUrl: string
) {
  if (!emailTransporter) {
    await initializeEmailService();
  }
  
  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: 'DoBag - Verify Your Email',
    text: `Thank you for registering with DoBag! Please verify your email by clicking on the following link: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4caf50;">Welcome to DoBag!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4caf50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p>If the button doesn't work, you can also click on this link:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  };
  
  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error };
  }
} 