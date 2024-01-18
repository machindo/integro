export type Artist = {
  /**
   * @minLength 1
   */
  name: string;
  dob?: Date;
  instruments?: string[];
};
