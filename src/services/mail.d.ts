export declare type Component = string | string[] | Component.Button | Component.Button[] | Component.Table;

export declare namespace Component {
  interface Button {
    /** Button text */
    name: string;
    /** Button link */
    location: string;
    /** Button color. Matches UA colors by default */
    color?: `#${string}`;
  }

  interface Table {
    name?: string;
    items: Array<{ [key: string]: string }>;
  }
}

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
}

export declare interface SerializedMail {
  to: string;
  subject: string;
  html: string;
}
