import { Column, Entity, OneToOne, JoinColumn, OneToMany, ManyToOne, Unique } from 'typeorm';
import { DynamicEntity } from './dynamicEntity';
import { User } from './user';
import { Tournament } from './tournament';

@Entity({ name: 'teams' })
@Unique(['name', 'tournament'])
export class Team extends DynamicEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  lockedAt: Date;

  @OneToOne(() => User, { nullable: false })
  @JoinColumn()
  captain: User;

  @OneToMany(() => User, (user) => user.team)
  users: User[];

  @ManyToOne(() => Tournament, (tournament) => tournament.teams, { nullable: false })
  tournament: Tournament;
}
