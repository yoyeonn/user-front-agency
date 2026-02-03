export interface Destinations {
  id: number;
  name: string;
  country: string;
  price: number;
  days: number;
  rating: number;
  description: string;
  about: string;
  images: string[];
  activities: Activity[];
  faq: Faq[];
  reviews: Review[];
  location:string;
  map: string;
  nearby: Nearby[];
  title: string;
}

export interface Activity {
  day: number;
  activity: string;
}

export interface Faq {
  question: string;
  answer: string;
  open?: boolean;
}

export interface Review {
  name: string;
  stars: number;
  comment: string;
}

export interface Nearby {
  name: string;
  distance: string;
}
