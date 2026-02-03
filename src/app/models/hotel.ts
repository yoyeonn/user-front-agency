export interface Room {
  id: number; 
  name: string;
  image: string;
  description: string;
  capacity: number;
  price: number;
}

export interface NearbyPlace {
  name: string;
  distance: string;
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

export interface ProgrammeDay {
  day: number;
  activity: string;
}

export interface Hotel {
  id: number;
  name: string;
  map: string;
  city: string;
  country: string;
  price?: number;
  stars?: number;
  images: string[];
  description?: string;
  days?: number; 
  about?: string;
  rooms?: Room[];
  nearby?: NearbyPlace[];
  faq?: Faq[];
  reviews?: Review[];
  highlights?: string[];
  programme?: ProgrammeDay[];
  cancellationPolicy?: string;
  availableDates?: string;
  bestTimeToVisit?: string;
  travelTips?: string[];
  suitedFor?: string[];
  includes?: string[];
  excludes?: string[];
  
}
