import API from "../api";

export const signupUser = async (userData) => {
return await API.post("/signup", userData);
};

export const loginUser = async (email, password) => {
const formData = new URLSearchParams();

formData.append("username", email);
formData.append("password", password);

const response = await API.post(
"/login",
formData,
{
headers: {
"Content-Type":
"application/x-www-form-urlencoded",
},
}
);

if (response.data.access_token) {
localStorage.setItem(
"token",
response.data.access_token
);
}

return response.data;
};

export const logoutUser = () => {
localStorage.removeItem("token");
};

export const isAuthenticated = () => {
return !!localStorage.getItem("token");
};
