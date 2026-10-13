export type Profile = {
  id: string;
  displayName: string;
  bio: string | null;
  timezone: string;
  marketingOptIn: boolean;
  updatedAt: Date;
};

/** Fields a client may change. A missing key means "leave as is". */
export type ProfilePatch = {
  displayName?: string;
  bio?: string | null;
  timezone?: string;
  marketingOptIn?: boolean;
};

export interface ProfileRepo {
  get(id: string): Promise<Profile | undefined>;
  /** Applies the patch and returns the new row, or undefined if the id does not exist. */
  update(id: string, patch: ProfilePatch): Promise<Profile | undefined>;
}
