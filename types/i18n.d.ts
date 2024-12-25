type Messages = typeof import('../messages/en.json');
declare interface IntlMessages extends Messages {
  // This is intentionally empty to satisfy TypeScript
  _: never;
} 