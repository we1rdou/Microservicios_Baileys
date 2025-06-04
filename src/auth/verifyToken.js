const TOKEN_VALIDO = process.env.API_TOKEN;

export default function verifyToken(token) {
  return token === TOKEN_VALIDO;
}
