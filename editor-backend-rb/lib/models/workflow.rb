# frozen_string_literal: true

require "active_record"
require "securerandom"

class Workflow < ActiveRecord::Base
  self.table_name = "workflows"

  belongs_to :owner, class_name: "User", foreign_key: :owner_id

  validates :label, presence: true

  # Use UUID as primary key, set before creation
  before_create :set_uuid

  private

  def set_uuid
    self.id ||= SecureRandom.uuid
  end
end
