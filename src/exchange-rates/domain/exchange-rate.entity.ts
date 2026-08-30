export type ExchangeRateSource = 'SUNAT' | 'BCV' | 'MANUAL';

export interface ExchangeRateProps {
  id?: string;
  currency: string;
  rate: number;
  source: ExchangeRateSource;
  updatedAt?: Date;
  createdAt?: Date;
}

export class ExchangeRate {
  private readonly _id?: string;
  private readonly _currency: string;
  private readonly _rate: number;
  private readonly _source: ExchangeRateSource;
  private readonly _updatedAt?: Date;
  private readonly _createdAt?: Date;

  constructor(props: ExchangeRateProps) {
    if (!props.currency || props.currency.trim().length === 0) {
      throw new Error('Currency is required.');
    }
    if (props.rate <= 0 || isNaN(props.rate)) {
      throw new Error('Exchange rate must be a positive number.');
    }
    this._id = props.id;
    this._currency = props.currency.trim().toUpperCase();
    this._rate = props.rate;
    this._source = props.source || 'MANUAL';
    this._updatedAt = props.updatedAt;
    this._createdAt = props.createdAt;
  }

  get id(): string | undefined {
    return this._id;
  }

  get currency(): string {
    return this._currency;
  }

  get rate(): number {
    return this._rate;
  }

  get source(): ExchangeRateSource {
    return this._source;
  }

  get updatedAt(): Date | undefined {
    return this._updatedAt;
  }

  get createdAt(): Date | undefined {
    return this._createdAt;
  }

  toJSON() {
    return {
      id: this._id,
      currency: this._currency,
      rate: this._rate,
      source: this._source,
      updatedAt: this._updatedAt,
      createdAt: this._createdAt,
    };
  }
}
