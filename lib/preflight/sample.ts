/** @author Uvin Vindula (IAMUVIN) @website https://iamuvin.com */
export const defaultSettings = {
  sourceOrigin: "https://old.example.com",
  targetOrigin: "https://new.example.com",
  migrationIntent: "permanent" as const,
};

export const riskySample = `source,target,status
https://old.example.com/about,https://old.example.com/company,301
https://old.example.com/company,https://new.example.com/company,301
/products,/catalog,302
/loop-a,https://old.example.com/loop-b,301
/loop-b,https://old.example.com/loop-a,301
/pricing,/plans,301
/pricing,/pricing-new,301
/help,https://old.example.com/help,301
/secure,http://new.example.com/secure,301
/legacy#team,/team,301
/old-a,/,301
/old-b,/,301
/old-c,/,301
/search?q=shoes,/search,301
/external,https://other.example.net/new,301`;

export const cleanSample = `source,target,status
/about,/company,301
/products,/catalog,308
/pricing,/plans,301
/help,/support,301
/news/2025,/news/archive,308`;
