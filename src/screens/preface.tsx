import { defineScreen } from '../nav/screen';
import { Preface } from '../Preface';

declare module '../nav/screen' {
  interface ScreenNames {
    preface: true;
  }
}

export const prefaceScreen = defineScreen({ name: 'preface', render: () => <Preface /> });
