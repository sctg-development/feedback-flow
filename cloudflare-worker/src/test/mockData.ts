import {
	Feedback,
	IdMapping,
	Publication,
	Purchase,
	Refund,
	Tester,
} from "../types/data";

// Sample data collections
export const testersData: Tester[] = [
	{
		uuid: "45f9830a-309b-4cda-95ec-71e000b78f7d",
		name: "John Doe",
		ids: ["auth0|1234567890"],
	},
	{
		uuid: "cc97a5cc-c4ba-4804-98b5-90532f09bd83",
		name: "Jane Doe",
		ids: ["auth0|0987654321"],
	},
];

/**
 * ID mappings table - simulates a separate table for ID lookups
 */
export const idMappingsData: IdMapping[] = [
	{
		id: "auth0|1234567890",
		testerUuid: "45f9830a-309b-4cda-95ec-71e000b78f7d",
	},
	{
		id: "auth0|0987654321",
		testerUuid: "cc97a5cc-c4ba-4804-98b5-90532f09bd83",
	},
];

export const purchasesData: Purchase[] = [
	{
		id: "d5726cf2-36f6-41d8-bd37-f349314561b4",
		testerUuid: "45f9830a-309b-4cda-95ec-71e000b78f7d",
		date: "2025-03-23",
		order: "123",
		description: "Test order",
		amount: 10.99,
		screenshot:
			"UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==",
		refunded: false,
	},
	{
		id: "aa92494a-a036-4a4e-9c6a-c3821a8cb6a4",
		testerUuid: "cc97a5cc-c4ba-4804-98b5-90532f09bd83",
		date: "2021-02-01",
		order: "456",
		description: "Test order 2",
		amount: 20.99,
		screenshot:
			"UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==",
		refunded: true,
	},
	{
		id: "b5e8c21d-7f4e-4a6b-9c3d-9e7a1f2b3c4d",
		testerUuid: "45f9830a-309b-4cda-95ec-71e000b78f7d",
		date: "2025-02-15",
		order: "789",
		description: "Premium product test",
		amount: 59.99,
		screenshot:
			"UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==",
		refunded: false,
	},
];

export const feedbacksData: Feedback[] = [
	{
		date: "2025-03-23",
		purchase: "d5726cf2-36f6-41d8-bd37-f349314561b4",
		feedback: "Great product, fast delivery and exactly as described!",
	},
	{
		date: "2021-02-05",
		purchase: "aa92494a-a036-4a4e-9c6a-c3821a8cb6a4",
		feedback: "Product was good but shipping took longer than expected.",
	},
];

export const publicationsData: Publication[] = [
	{
		date: "2025-03-23",
		purchase: "d5726cf2-36f6-41d8-bd37-f349314561b4",
		screenshot:
			"UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==",
	},
	{
		date: "2021-02-10",
		purchase: "aa92494a-a036-4a4e-9c6a-c3821a8cb6a4",
		screenshot:
			"UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==",
	},
];

export const refundsData: Refund[] = [
	{
		date: "2025-03-25",
		purchase: "d5726cf2-36f6-41d8-bd37-f349314561b4",
		refunddate: "2025-03-28",
		amount: 10.99,
	},
	{
		date: "2021-02-15",
		purchase: "aa92494a-a036-4a4e-9c6a-c3821a8cb6a4",
		refunddate: "2021-02-20",
		amount: 20.99,
	},
];

export const mockData = {
	ids: idMappingsData,
	testers: testersData,
	purchases: purchasesData,
	feedbacks: feedbacksData,
	publications: publicationsData,
	refunds: refundsData,
};
