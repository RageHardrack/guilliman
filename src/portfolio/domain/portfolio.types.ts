export interface IProject {
  id: string;
  Name: string;
  Slug: string;
  Tags: string[];
  Repository?: string;
  Preview: string;
  Language: string;
  Orden: number;
}

export interface ISkill {
  id: string;
  Name: string;
  Image_URL: string;
  Orden: number;
  Tags: string[];
}

export interface IExperience {
  id: string;
  Work: string;
  Stack: string[];
  Orden: number;
  Description: string;
  Period: string;
}

export interface ChildDatabase {
  id: string;
  object: string;
  type: string;
  title: string;
}
