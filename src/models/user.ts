import { Entity, Column, ManyToOne, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { IsEmail } from 'class-validator';
import { UserType } from '../types';
import DynamicEntity from './dynamicEntity';
import TeamModel from './team';
import CartModel from './cart';
import CartItemModel from './cartItem';

@Entity({ name: 'users' })
export default class UserModel extends DynamicEntity {
  @Column({ length: 100, nullable: true }) // In case of visitor
  username: string;

  @Column({ length: 100 })
  firstname: string;

  @Column({ length: 100 })
  lastname: string;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: UserType })
  type: UserType;

  @Column({ nullable: true })
  permissions: string;

  @Column({ type: 'char', length: 4, nullable: true })
  place: string;

  @Column({ nullable: true })
  scannedAt: Date;

  @Column({ nullable: true })
  discordId: string;

  @ManyToOne(() => TeamModel, (team) => team.users, { onDelete: 'SET NULL' })
  team: TeamModel;

  @ManyToOne(() => TeamModel, (team) => team.users, { onDelete: 'SET NULL' })
  askingTeam: TeamModel;

  @OneToMany(() => CartModel, (cart) => cart.user)
  carts: CartModel[];

  @OneToMany(() => CartItemModel, (cartItem) => cartItem.forUser)
  cartItems: CartItemModel[];

  @BeforeInsert()
  @BeforeUpdate()
  checkUsernameConsistency(): void {
    if (this.type !== UserType.Visitor && !this.username) {
      throw new Error("Non visitor doesn't have a username !");
    } else if (this.type === UserType.Visitor && this.username) {
      throw new Error('Visitor has a username !');
    }
  }
}
