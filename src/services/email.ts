import { ItemCategory } from '@prisma/client';
import { User } from 'discord.js';
import QRCode from 'qrcode';
import { readFileSync } from 'fs';
import { render } from 'mustache';
import nodemailer from 'nodemailer';
import Mail, { Address } from 'nodemailer/lib/mailer';
import { fetchItems } from '../operations/item';
import { fetchUser } from '../operations/user';
import { CartItem, CartWithCartItems, DetailedCart, EmailAttachement, EmailContent, MailData } from '../types';
import env from '../utils/env';
import { encryptQrCode, formatPrice } from '../utils/helpers';
import logger from '../utils/logger';
import { generateTicket } from '../utils/pdf';

const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  auth: {
    user: env.email.user,
    pass: env.email.password,
  },
  pool: true,
  maxConnections: 1,
});

// emailType for welcome mail with tickets and discount codes
export const sendWelcomeEmail = (data: MailData) => {
  const template = readFileSync('assets/email/welcome/welcome.html').toString();
  const mailContent = {
    title: 'Informations importantes - UTT Arena 2020',
    html: render(template, {
      username: data.username,
      gunnarCode: data.gunnarCode,
      compumsaCode: data.compumsaCode,
    }),
  } as EmailContent;
  return mailContent;
};

// export const sendEmail = async (
//   emailType: { (data: MailData): EmailContent },
//   to: string | Address | Array<string | Address>,
//   data: MailData,
//   attachments?: Mail.Attachment[],
// ) => {
//   const mailContent = emailType(data);
//   const info = await transporter
//     .sendMail({
//       from: env.email.sender,
//       to,
//       subject: mailContent.title,
//       html: mailContent.html,
//       attachments,
//     })
//     .then((response) => {
//       if (response.messageId) {
//         logger.debug(response.messageId);
//       } else {
//         const logMessage = `Mail to ${to} not delivered ?`;
//         logger.error(logMessage);
//       }
//     });
//   return info;
// };

export const sendEmail = async (to: string, subject: string, html: string, attachments?: EmailAttachement[]) => {
  const info = await transporter.sendMail({
    from: env.email.sender,
    to,
    subject,
    html,
    attachments,
  });

  console.log(info);
};

export const generatePayementHtml = (cart: DetailedCart) => {
  const template = readFileSync('assets/email/templates/payment.html').toString();
  const templateVariables = {
    username: cart.user.username,
    tickets: cart.cartItems
      .filter((cartItem) => cartItem.item.category === ItemCategory.ticket)
      .map((ticket) => ({
        name: `${ticket.forUser.firstname} ${ticket.forUser.lastname}`,
        itemName: ticket.item.name,
        itemPrice: formatPrice(ticket.item.price),
      })),
    supplements: cart.cartItems
      .filter((cartItem) => cartItem.item.category === ItemCategory.supplement)
      .map((supplement) => ({
        itemName: supplement.item.name,
        quantity: supplement.quantity,
        itemPrice: formatPrice(supplement.item.price),
      })),
  };

  return render(template, templateVariables);
};

export const sendTickets = async (cart: DetailedCart) => {
  // Filter the cart items to have only the tickets
  const tickets = cart.cartItems.filter((cartItem) => cartItem.item.category === ItemCategory.ticket);

  // Generate all the pdf tickets
  const pdfTickets = await Promise.all(tickets.map(generateTicket));

  // Generate the html template
  const html = generatePayementHtml(cart);

  return sendEmail(cart.user.email, env.email.subjects.payment, html, pdfTickets);
};
