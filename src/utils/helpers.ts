export const getCurrency = (currency: string) => {
    if (currency === "USD") {
      return "$";
    }
  
    if (currency === "GBP") {
      return "£";
    }
  
    return "€";
  };
  
  export const getTrialFormattedPrice = (price: number, currency: string) => {
    if (currency === "USD") {
      return `$${price / 100}`;
    }

    if (currency === "GBP") {
      return `£${price / 100}`;
    }

    return `€${price / 100}`;
  };

  export const getAnnualFormattedPrice = (price: number, currency: string) => {
    if (currency === "USD") {
      return `$${price / 1000}`;
    }

    if (currency === "GBP") {
      return `£${price / 1000}`;
    }
    return `€${price / 1000}`;
  };

