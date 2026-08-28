export interface UserProps {
  id: string;
  email: string;
  password: string;
  name?: string | null;
  taxProfileEnabled?: boolean;
  taxCountry?: string;
  taxRuc?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  private readonly _id: string;
  private _email: string;
  private _password: string;
  private _name: string | null;
  private _taxProfileEnabled: boolean;
  private _taxCountry: string;
  private _taxRuc: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserProps) {
    this._id = props.id;
    this._email = props.email;
    this._password = props.password;
    this._name = props.name ?? null;
    this._taxProfileEnabled = props.taxProfileEnabled ?? false;
    this._taxCountry = props.taxCountry ?? 'PE';
    this._taxRuc = props.taxRuc ?? null;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get password(): string {
    return this._password;
  }

  get name(): string | null {
    return this._name;
  }

  get taxProfileEnabled(): boolean {
    return this._taxProfileEnabled;
  }

  get taxCountry(): string {
    return this._taxCountry;
  }

  get taxRuc(): string | null {
    return this._taxRuc;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateProfile(name?: string, email?: string): void {
    if (name !== undefined) this._name = name;
    if (email !== undefined) this._email = email;
    this._updatedAt = new Date();
  }

  updateTaxProfile(taxProfileEnabled?: boolean, taxCountry?: string, taxRuc?: string | null): void {
    if (taxProfileEnabled !== undefined) this._taxProfileEnabled = taxProfileEnabled;
    if (taxCountry !== undefined) this._taxCountry = taxCountry;
    if (taxRuc !== undefined) this._taxRuc = taxRuc;
    this._updatedAt = new Date();
  }
}
