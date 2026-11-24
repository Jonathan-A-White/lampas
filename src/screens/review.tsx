import { defineScreen } from '../nav/screen';
import { ReviewScreen } from '../ReviewScreen';

declare module '../nav/screen' {
  interface ScreenNames {
    review: true;
  }
}

export const reviewScreen = defineScreen({ name: 'review', render: (props) => <ReviewScreen newRandom={props.newRandom} /> });
