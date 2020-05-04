import { PrimaryColumn, CreateDateColumn, UpdateDateColumn, BaseEntity, BeforeInsert, BeforeUpdate } from 'typeorm';
import { validate } from 'class-validator';
import nanoid from '../utils/nanoid';

export abstract class DynamicEntity extends BaseEntity {
  @PrimaryColumn({ type: 'char', length: 6 })
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateNanoid() {
    this.id = nanoid();
  }

  @BeforeInsert()
  @BeforeUpdate()
  async validate() {
    const errors = await validate(this);
    if (errors.length > 0) {
      throw errors;
    }
  }
}
