export type Block = {
	id:               string;
	type:             string;
	order:            number;
	props:            Record<string, unknown>;
	version:          number;
	parent_block_id?: string | null;
};

export interface FontSpec {
	family:  string;
	weights: number[];
	source:  'google' | 'system' | 'custom';
	urls?:   { weight: number; style?: string; url: string }[];
}

export interface LegalDraft {
	address:       string;
	legal_name:    string;
	tax_id:        string;
	business_type: string;
	postal_code:   string;
	city:          string;
	state:         string;
	country:       string;
	email:         string;
	phone:         string;
	legalLinks:    { label: string; href: string }[];
}

export interface Asset {
	id:         string;
	key:        string;
	url:        string;
	thumb_url:  string | null;
	filename:   string;
	mime_type:  string;
	size_bytes: number | null;
	created_at: string;
}
