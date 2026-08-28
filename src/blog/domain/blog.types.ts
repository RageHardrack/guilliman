export interface IPost {
  id: string;
  Tags: string[];
  Image_URL: string;
  Status: string;
  Slug: string;
  Fecha_Publicacion: string;
  Brief: string;
  Post: string;
  Prevent_Index: boolean;
  Language: string;
  Stage: string;
}

export interface ContentBlock {
  object: string;
  id: string;
  type: string;
  body: string;
  caption: string;
  emoji: string | null;
}
