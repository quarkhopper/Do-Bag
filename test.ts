interface User {
  id: number;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return `Hello ${user.name}! Your email is ${user.email}`;
}

// Test the function
const testUser: User = {
  id: 1,
  name: "Test User",
  email: "test@example.com"
};

console.log(greetUser(testUser));

// New content here
