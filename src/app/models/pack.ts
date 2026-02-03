import { Destinations } from "./destinations";
import { Hotel, Room } from "./hotel";

export interface Activity {
  day: number;
  activity: string;
}

export interface Faq {
  question: string;
  answer: string;
  open: boolean;
}

export interface Review {
  name: string;
  stars: number;
  comment: string;
}

export interface Nearby {
  name: string;
  distance: number;
}

export interface Pack {
  hotel: Hotel;
  destination: Destinations;
  rooms: Room[];
  id: number;
  name: string;
  country: string;
  price: number;
  days: number;
  rating: number;
  location: string;
  map: string;
  description: string;
  about: string;
  images: string[];
  activities: Activity[];
  faq: Faq[];
  reviews: Review[];
  nearby: Nearby[];
}