import { PrimaryColumn, CreateDateColumn, UpdateDateColumn, BaseEntity, BeforeInsert, BeforeUpdate } from 'typeorm';
import { validate } from 'class-validator';
import nanoid from '../utils/nanoid';

export default abstract class DynamicEntity extends BaseEntity {
  @PrimaryColumn({ type: 'char', length: 6 })
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateNanoid(): void {
    this.id = nanoid();
  }

  @BeforeInsert()
  @BeforeUpdate()
  async validate(): Promise<void> {
    const errors = await validate(this);
    if (errors.length > 0) {
      throw errors;
    }
  }
}
