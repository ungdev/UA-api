import { EmailAttachement } from '../../types';

export interface MailButton {
  /** Button text */
  name: string;
  /** Button link */
  location: string;
  /** Button color. Matches UA colors by default */
  color?: `#${string}`;
}

export interface MailTable {
  /** Name of the table. Displayed BEFORE the table */
  name?: string;
  /**
   * List of ALL rows contained in the table.
   * The first element of thie array will be used for column creation:
   * All keys of this object will be attached to a column, named by the
   * item value corresponding to the (column) key
   * All other object will match one single row and fill the columns depending
   * on their keys.
   * This means that all columns must be defined in the first object
   */
  items: Array<{ [key: string]: string }>;
}

export declare type Component = string | string[] | MailButton | MailButton[] | MailTable;

export declare interface Mail {
  /** The email address to send this email to (written in the footer, before the {@link reason}) */
  receiver: string;
  /** The reason why this mail was sent to the user. */
  reason: string;
  title: {
    /**
     * The title of the mail (in the html `title` tag).
     * This is also the subject of the mail.
     * Don't include 'UTT Arena {year}' as it is appended automatically
     * when generating the mail.
     */
    topic: string;
    /** The title displayed in the banner, next to the logo */
    banner: string;
    /**
     * The title (or part of title) displayed at the beginning of the content box,
     * in a small/regular font size
     */
    short: string;
    /**
     * The title (or part of title) displayed right after {@link title#short},
     * in a pretty big font size
     */
    highlight: string;
  };
  /**
   * The fields contained in your mail. If this property is omitted (or if the list is empty),
   * a default error field will be displayed instead.
   */
  sections?: {
    title: string;
    components: Component[];
  }[];
  /**
   * The attachments to include in the mail. If this property is omitted (or if the list is empty),
   * no attachment will be included in the mail.
   */
  attachments?: EmailAttachement[];
}

export declare interface SerializedMail {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachement[];
}
