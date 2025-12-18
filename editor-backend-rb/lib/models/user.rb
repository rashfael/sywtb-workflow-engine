# frozen_string_literal: true

require "active_record"

class User < ActiveRecord::Base
  self.table_name = "users"

  validates :email, presence: true, uniqueness: true
  validates :password_hash, presence: true

  has_many :workflows, foreign_key: :owner_id
end
