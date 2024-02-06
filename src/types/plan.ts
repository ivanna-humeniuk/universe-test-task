import { PaymentPlanId } from "../use-cases/get-subscription-products";

export type Bullets = {
    imgSrc: string;
    bullText: JSX.Element;
  };
  
  export interface Plan {
    id: PaymentPlanId;
    title: string;
    price: string;
    date: string | null;
    bullets: Bullets[];
    bulletsC?: Bullets[];
    text: string | JSX.Element;
    formattedCurrency?: string;
    fullPrice?: string;
  }