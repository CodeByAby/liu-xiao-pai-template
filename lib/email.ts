import { Resend } from 'resend';

// 获取默认发件邮箱的函数
const getDefaultFromEmail = () => {
  // 1. 优先使用用户配置的完整发件地址
  if (process.env.RESEND_FROM_EMAIL) {
    return process.env.RESEND_FROM_EMAIL;
  }
  
  // 2. 开发环境使用 Resend 测试邮箱
  if (process.env.NODE_ENV === 'development') {
    return 'Sistine AI <onboarding@resend.dev>';
  }
  
  // 3. 生产环境要求必须配置
  if (!process.env.RESEND_VERIFIED_DOMAIN) {
    console.error('❌ RESEND_VERIFIED_DOMAIN is required in production');
    console.error('Please add RESEND_VERIFIED_DOMAIN to your environment variables');
    console.error('Example: RESEND_VERIFIED_DOMAIN=yourdomain.com');
    // 返回一个明显的错误邮箱，让问题立即暴露
    return 'DOMAIN_NOT_CONFIGURED@example.com';
  }
  
  // 4. 使用配置的域名和应用名称
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Sistine AI';
  const fromName = process.env.RESEND_FROM_NAME || appName;
  return `${fromName} <noreply@${process.env.RESEND_VERIFIED_DOMAIN}>`;
};

export function getResendClient(apiKey = process.env.RESEND_API_KEY) {
  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react?: React.ReactElement;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface PurchaseEmailDetails {
  orderId: string;
  plan: string;
  amount: string;
  credits: number;
  type: "subscription" | "one_time";
}

export async function sendEmail({
  to,
  subject,
  react,
  html,
  text,
  from,
  replyTo,
}: SendEmailOptions) {
  try {
    const resend = getResendClient();
    if (!resend) {
      const error = new Error("RESEND_API_KEY is not configured");
      console.warn("[Email] Skipping send because RESEND_API_KEY is missing");
      return { success: false, error };
    }

    const data = await resend.emails.send({
      to,
      subject,
      react,
      html,
      text,
      from: from ?? getDefaultFromEmail(),
      ...(replyTo ? { replyTo } : {}),
    });

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

// 发送验证邮件
export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Verify your email - Sistine AI',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to Sistine AI!</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Verify Email
        </a>
        <p>Or copy this link to your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          If you didn't sign up for Sistine AI, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// 发送密码重置邮件
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Reset your password - Sistine AI',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p>We received a request to reset your password. Click the link below to reset it:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy this link to your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

// 发送欢迎邮件
export async function sendWelcomeEmail(email: string, name?: string) {
  return sendEmail({
    to: email,
    subject: 'Welcome to Sistine AI!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to Sistine AI${name ? ', ' + name : ''}!</h1>
        <p>Thank you for joining us! We're excited to have you on board.</p>
        <p>Here's what you can do next:</p>
        <ul style="line-height: 1.8;">
          <li>Complete your profile</li>
          <li>Explore our features</li>
          <li>Try the demo</li>
          <li>Check out our documentation</li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Go to Dashboard
        </a>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          If you have any questions, feel free to contact our support team.
        </p>
      </div>
    `,
  });
}

// 发送订单成功邮件
export async function sendPurchaseEmail(email: string, orderDetails: PurchaseEmailDetails) {
  const planName = orderDetails.type === 'subscription' 
    ? `${orderDetails.plan} Subscription` 
    : `${orderDetails.credits} Credits Pack`;

  return sendEmail({
    to: email,
    subject: 'Purchase Confirmation - Sistine AI',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Purchase Successful!</h1>
        <p>Thank you for your purchase. Here are your order details:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
          <p><strong>Product:</strong> ${planName}</p>
          <p><strong>Amount:</strong> ${orderDetails.amount}</p>
          <p><strong>Credits Added:</strong> ${orderDetails.credits}</p>
          ${orderDetails.type === 'subscription' ? '<p><strong>Type:</strong> Monthly Subscription</p>' : ''}
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View Dashboard
        </a>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Thank you for choosing Sistine AI!
        </p>
      </div>
    `,
  });
}

// 发送订阅到期提醒
export async function sendSubscriptionExpiryReminder(email: string, daysRemaining: number) {
  return sendEmail({
    to: email,
    subject: `Your subscription expires in ${daysRemaining} days - Sistine AI`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Subscription Expiry Reminder</h1>
        <p>Your Sistine AI subscription will expire in <strong>${daysRemaining} days</strong>.</p>
        <p>To continue enjoying uninterrupted access to our services, please renew your subscription.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Renew Subscription
        </a>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `,
  });
}

// 发送积分不足提醒
export async function sendLowCreditsNotification(email: string, remainingCredits: number) {
  return sendEmail({
    to: email,
    subject: 'Low Credits Alert - Sistine AI',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ff6b6b;">Low Credits Alert</h1>
        <p>You have only <strong>${remainingCredits} credits</strong> remaining in your account.</p>
        <p>To continue using our AI services without interruption, consider purchasing more credits.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Buy More Credits
        </a>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Need help? Contact our support team.
        </p>
      </div>
    `,
  });
}
