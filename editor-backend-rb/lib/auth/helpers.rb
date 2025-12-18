# frozen_string_literal: true

require "jwt"
require "argon2"

# JWT and password authentication helpers
module Auth
  JWT_SECRET = ENV.fetch("JWT_SECRET", "totally_random_secret_key_do_not_steal")
  JWT_ALGORITHM = "HS256"
  TOKEN_EXPIRY = 12 * 60 * 60 # 12 hours

  class << self
    # Generate a JWT token for a user
    # @param email [String] the user's email (used as subject)
    # @return [String] the JWT token
    def generate_token(email)
      payload = {
        sub: email,
        exp: Time.now.to_i + TOKEN_EXPIRY
      }
      JWT.encode(payload, JWT_SECRET, JWT_ALGORITHM)
    end

    # Verify and decode a JWT token
    # @param token [String] the JWT token
    # @return [Hash] the decoded payload
    # @raise [JWT::DecodeError] if token is invalid
    def verify_token(token)
      decoded = JWT.decode(token, JWT_SECRET, true, algorithm: JWT_ALGORITHM)
      decoded.first.transform_keys(&:to_sym)
    end

    # Hash a password using Argon2id
    # @param password [String] the plain text password
    # @return [String] the hashed password
    def hash_password(password)
      hasher = Argon2::Password.new(
        t_cost: 3,
        m_cost: 16, # 2^16 = 65536 KB
        p_cost: 4
      )
      hasher.create(password)
    end

    # Verify a password against a hash
    # @param password [String] the plain text password
    # @param hash [String] the stored hash
    # @return [Boolean] true if password matches
    def verify_password(password, hash)
      Argon2::Password.verify_password(password, hash)
    end
  end
end
