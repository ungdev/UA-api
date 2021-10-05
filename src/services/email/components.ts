import { escape } from 'mustache';
import type { Component } from './types';

export const style = {
  text: {
    color: '#202020',
    font: 'Nunito,Roboto,Arial,sans-serif',
  },
  title: {
    color: '#006492',
    font: 'Montserrat,Roboto,Arial,sans-serif',
  },
  button: {
    background: '#f1737f',
    font: '#fff',
  },
  sep: {
    color: '#fbb464',
  },
};

/**
 * Escapes text before inserting it into a mail.
 * Turns  *text* into bold text,
 *        _text_ into italics,
 *        \n into <br> (line break),
 *        prevents &nbsp; to be escaped
 * @param text formats text for a mail
 * @returns formatted text (as html)
 */
export const escapeText = (text: string) =>
  escape(text)
    .replace(/&amp;nbsp;/gi, '&nbsp;')
    .replace(/\n/gi, '<br>')
    .replace(/_([^<>_]+)_/gi, '<i>$1</i>')
    .replace(/\*([^*<>]+)\*/gi, '<strong>$1</strong>');

const inflateButton = (item: Component.Button) =>
  `<td style="background-color:${
    item.color ? item.color : style.button.background
  };border-radius:2px;padding:3px 6px 2px"><a target="_blank" href="${escapeText(
    item.location,
  )}" style="border:none;text-decoration:none;color:${style.button.font};user-select:none;font-family:${
    style.text.font
  }">${item.name}</a></td>`;

const inflateButtonWrapper = (item: Component.Button | Component.Button[]) =>
  `<tr><td><table style="border:none;border-spacing:5px"><tbody><tr>${
    Array.isArray(item) ? item.map(inflateButton).join('') : inflateButton(item)
  }</tr></tbody></table></td></tr>`;

const inflateTable = (item: Component.Table) => {
  const properties = Object.keys(item.items[0] ?? {});
  if (properties.length === 0 || item.items.length < 2) return '';
  return `${
    item.name
      ? `<tr><td style="font-size:18px;color:${style.title.color};font-family:${style.title.font};padding:8px 0">${item.name}</td></tr>`
      : ''
  }<tr><td><table style="width:100%;background-color:#f6f6f6;border-collapse:collapse;border-radius:4px;overflow:hidden;font-family:${
    style.text.font
  }"><thead style="background-color:${style.text.color};color:${style.button.font}"><tr>${properties
    .map(
      (propertyName, index) =>
        `<td style="padding:5px${index === 0 ? '' : ';text-align:center'}">${escapeText(
          item.items[0][propertyName],
        )}</td>`,
    )
    .join('')}</tr></thead><tbody>${item.items
    .slice(1)
    .map(
      (row, rowIndex) =>
        `<tr${rowIndex % 2 ? '' : ' style="background-color:#e8e8e8"'}>${properties
          .map(
            (propertyName, index) =>
              `<td style="padding:5px${index === 0 ? '' : ';text-align:center'}">${escapeText(row[propertyName])}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('')}</tbody></table></td></tr>`;
};

const inflateList = (item: string[]) =>
  `<tr><td><ul>${item
    .map((listItem) => `<li style="font-family:${style.text.font}">${escapeText(listItem)}</li>`)
    .join('')}</ul></td></tr>`;

const inflateText = (item: string) =>
  `<tr><td style="color:${
    style.text.color
  };-webkit-text-size-adjust:none;-ms-text-size-adjust:none;position:relative;font-family:${
    style.text.font
  }">${escapeText(item)}</td></tr>`;

/**
 * Turns a {@link Component} into its html form
 * @param content the {@link Component} to turn into html
 * @returns raw html
 */
export const inflate = (content: Component): string => {
  if (typeof content === 'string') return inflateText(content);
  if (Array.isArray(content)) {
    if (content.some((item: string | Component.Button) => typeof item !== 'object'))
      return inflateList(<string[]>content);
    return inflateButtonWrapper(<Component.Button[]>content);
  }
  if ('location' in content) return inflateButtonWrapper(content);
  if ('items' in content) return inflateTable(content);

  throw new Error('Cannot inflate unrecognized component');
};
