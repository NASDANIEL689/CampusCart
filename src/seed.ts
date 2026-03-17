import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

async function seedData() {
  try {
    // Seed Vendors
    const vendorRef = await addDoc(collection(db, 'vendors'), {
      name: "The Lunch Box",
      description: "Freshly made sandwiches, salads and wraps. Healthy options for students.",
      logo: "https://images.unsplash.com/photo-1547584370-2cc98b8b8dc8?auto=format&fit=crop&q=80&w=1000",
      location: "East Wing Cafeteria",
      operatingHours: "7:00 AM - 3:00 PM",
      status: "approved",
      createdAt: Timestamp.now()
    });

    await addDoc(collection(db, 'vendors'), {
      name: "Burger Haven",
      description: "Juicy burgers, crispy fries and thick milkshakes. The ultimate comfort food.",
      logo: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&q=80&w=1000",
      location: "Main Courtyard",
      operatingHours: "10:00 AM - 5:00 PM",
      status: "approved",
      createdAt: Timestamp.now()
    });

    // Seed Listings
    await addDoc(collection(db, 'listings'), {
      sellerId: "sample_seller_1",
      title: "Calculus Early Transcendentals",
      description: "Used for one semester. Good condition, no highlighting.",
      price: 45,
      category: "Books",
      condition: "used",
      photos: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=1000"],
      status: "available",
      createdAt: Timestamp.now()
    });

    await addDoc(collection(db, 'listings'), {
      sellerId: "sample_seller_2",
      title: "Mechanical Keyboard - RGB",
      description: "Blue switches, very clicky. Perfect for coding or gaming.",
      price: 60,
      category: "Electronics",
      condition: "new",
      photos: ["https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=1000"],
      status: "available",
      createdAt: Timestamp.now()
    });

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Error seeding data:", error);
  }
}

// This is a helper to be called from console or a button if needed
export { seedData };
