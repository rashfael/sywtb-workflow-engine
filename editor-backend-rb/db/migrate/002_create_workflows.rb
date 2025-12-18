# frozen_string_literal: true

class CreateWorkflows < ActiveRecord::Migration[7.1]
  def change
    create_table :workflows, id: :uuid do |t|
      t.string :label, null: false
      t.references :owner, type: :uuid, null: false, foreign_key: { to_table: :users }

      t.timestamps
    end
  end
end
